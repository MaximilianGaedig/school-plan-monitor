import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client'
import { PDFDocument } from 'pdf-lib';
import { fromBuffer } from "pdf2pic";
import { createHash } from 'crypto';
import { Stream } from 'stream';
import { writeFile } from 'fs/promises';
import http from 'http';

const planUrl = 'https://zs1-swarzedz.pl/wp-content/uploads/2022/01/Technikum_plan1.pdf';
const planPage = 29;

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL) {
  throw new Error('No DATABASE_URL');
}

if (!process.env.TELEGRAM_TOKEN) {
  throw new Error('No TELEGRAM_TOKEN');
}

console.log('Connecting to', process.env.DATABASE_URL);


// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

const sendPdfAndImage = async (chatId: number, plan: string | Buffer | Stream, image: string | Buffer | Stream, caption: string) => {
  await bot.sendDocument(chatId, plan, {
    caption,
  }, { filename: 'plan' });
  await bot.sendPhoto(chatId, image, {
    caption,
  }, { filename: 'plan' });
};

const bindChat = async (chatId: number, fromId: number) => {
  const dbChat = await prisma.boundChat.findFirst({
    where: {
      chatId,
    },
  });


  if (dbChat) {
    bot.sendMessage(chatId, `Already bound to ${chatId} by ${dbChat.userId}`);
    return;
  }

  await prisma.boundChat.create({
    data: {
      chatId,
      userId: fromId,
    },
  });

  bot.sendMessage(chatId, `Bound to ${chatId}`);
};

bot.on('my_chat_member', async (msg) => {
  try {
    const chatId = msg.chat.id;

    if (msg.new_chat_member.status === 'member') {
      await bindChat(chatId, msg.from.id);
    } else if (msg.new_chat_member.status === 'left') {
      await prisma.boundChat.delete({
        where: {
          chatId,
        },
      });
    } else {
      console.log('Unknown status', msg.new_chat_member.status);
    }

  } catch (e) {
    console.error(e);
  }
});

// Matches "/echo [whatever]"
bot.onText(/\/bind/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (msg.chat.type !== 'private') {
      bot.sendMessage(chatId, 'Please send this command in private chat');
      return;
    }

    if (!msg.from?.id) {
      bot.sendMessage(chatId, 'No from id');
      console.log('No from id');
      return;
    }

    await bindChat(chatId, msg.from.id);
  } catch (e) {
    console.error(e);
  }
});

bot.onText(/\/plan/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    const dbChat = await prisma.boundChat.findFirst({
      where: {
        chatId,
      },
    });

    if (!dbChat) {
      bot.sendMessage(chatId, `Not bound to ${chatId}, use \`/bind\` in pm to bind`);
      return;
    }

    const plan = await prisma.plan.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!plan) {
      bot.sendMessage(chatId, `No plan`);
      return;
    }

    if (!plan.image) {
      bot.sendMessage(chatId, `No plan image`);
      return;
    }
    await sendPdfAndImage(chatId, plan.file, plan.image, 'Plan lekcji');
  } catch (e) {
    console.error(e);
  }
});

// periodically check for new plan
// if new plan, send message to all bound chats
const checkForNewPlan = async () => {
  try {
    console.log('Checking for new plan');
    const planResponse = await fetch(planUrl);
    // parse pdf
    const planBuffer = Buffer.from(await planResponse.arrayBuffer());

    const hash = createHash('sha256').update(planBuffer).digest('hex');

    const planByHash = await prisma.plan.findFirst({
      where: {
        hash,
      },
    });



    if (planByHash?.image) {
      await writeFile('plan.png', planByHash.image);
      return;
    }


    const planPdf = await PDFDocument.load(planBuffer);
    for (let i = 0; i < planPage - 1; i++) {
      planPdf.removePage(0);
    }
    while (planPdf.getPageCount() > 1) {
      planPdf.removePage(1);
    }
    const trimmedPlanBuffer = Buffer.from(await planPdf.save());

    if (!planByHash) {
      await prisma.plan.create({
        data: {
          hash,
          file: trimmedPlanBuffer,
        },
      });
    }

    const baseUnit = 500;
    const convert = fromBuffer(planBuffer, {
      density: 300,
      format: "png",
      width: baseUnit * 3,
      height: baseUnit * 2,
      quality: 100
    });

    const image = await convert(planPage, { responseType: "buffer" });
    console.log('image', JSON.stringify(image).slice(0, 100));

    if (!image.buffer) {
      console.error('no image');
      return;
    }

    await prisma.plan.update({
      where: {
        hash,
      },
      data: {
        image: image.buffer,
      },
    });

    const boundChats = await prisma.boundChat.findMany();

    for (const boundChat of boundChats) {
      sendPdfAndImage(Number(boundChat.chatId), Buffer.from(await planPdf.save()), image.buffer, 'Nowy plan lekcji');
    }
  } catch (e) {
    console.error(e);
  }
};

checkForNewPlan();

setInterval(checkForNewPlan, 1000 * 60 * 10); // 10 minutes

// keep alive
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('OK');
  res.end();
}).listen(3000);

setInterval(async () => {
  console.log('Pinging');
  await fetch('https://school-plan-monitor.onrender.com/');
}, 1000 * 60 * 2); // 2 minutes
