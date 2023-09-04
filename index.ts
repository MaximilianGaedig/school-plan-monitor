import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client'
import { PDFDocument } from 'pdf-lib';
import { fromBuffer } from "pdf2pic";
import { createHash } from 'crypto';
import { Stream } from 'stream';
const planUrl = 'https://zs1-swarzedz.pl/wp-content/uploads/2022/01/Technikum_plan1.pdf';
const planPage = 29;

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL) {
  throw new Error('No DATABASE_URL');
}
console.log('Connecting to', process.env.DATABASE_URL);


const token = '5838274386:AAFRxEeRA6YW3Vttbemoax1dPxNteEIOaJ8';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

const sendPdfAndImage = async (chatId: number, plan: string | Buffer | Stream, image: string | Buffer | Stream, caption: string) => {
  bot.sendDocument(chatId, plan, {
    caption,
  }, { filename: 'plan.pdf' });
  bot.sendPhoto(chatId, image, {
    caption,
  }, { filename: 'plan.png' });
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome');
});

// Matches "/echo [whatever]"
bot.onText(/\/bind/, async (msg) => {
  const chatId = msg.chat.id;

  const dbChat = await prisma.boundChat.findFirst({
    where: {
      chatId,
    },
  });


  if (dbChat) {
    bot.sendMessage(chatId, `Already bound to ${chatId} by ${dbChat.userId}`);
    return;
  }

  if (!msg.from) {
    console.error('no from');
    return;
  }

  await prisma.boundChat.create({
    data: {
      chatId,
      userId: msg.from.id,
    },
  });

  bot.sendMessage(chatId, `Bound to ${chatId}`);
});

bot.onText(/\/plan/, async (msg) => {
  const chatId = msg.chat.id;

  const dbChat = await prisma.boundChat.findFirst({
    where: {
      chatId,
    },
  });

  if (!dbChat) {
    bot.sendMessage(chatId, `Not bound to ${chatId}`);
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

  bot.sendDocument(chatId, plan.file, {
    caption: 'Plan lekcji',
  });

  bot.sendPhoto(chatId, plan.image, {
    caption: 'Plan lekcji',
  });
});



// periodically check for new plan
// if new plan, send message to all bound chats

const checkForNewPlan = async () => {
  const planResponse = await fetch(planUrl);
  // parse pdf
  const planBuffer = Buffer.from(await planResponse.arrayBuffer());

  const hash = createHash('sha256').update(planBuffer).digest('hex');


  console.log(hash);

  const planByHash = await prisma.plan.findFirst({
    where: {
      hash,
    },
  });

  if (planByHash?.image) {
    console.log('Plan has image', planByHash.image);
    return;
  }

  if (!planByHash) {
    await prisma.plan.create({
      data: {
        hash,
        file: planBuffer,
      },
    });
  }

  const planPdf = await PDFDocument.load(planBuffer);
  const onePagePdf = await PDFDocument.create();
  onePagePdf.copyPages(planPdf, [planPage]);
  const onePagePdfBuffer = await onePagePdf.save();

  const convert = fromBuffer(Buffer.from(onePagePdfBuffer), { format: "png", width: 2000, quality: 100 });
  const image = await convert(1, { responseType: "buffer" });

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
    sendPdfAndImage(boundChat.chatId, Buffer.from(onePagePdfBuffer), image.buffer, 'Nowy plan lekcji');
  }
};

checkForNewPlan();

setInterval(checkForNewPlan, 1000 * 60 * 20); // 20 minutes


// keep alive
setInterval(async () => {
  await fetch('https://school-plan-monitor.onrender.com/');
}, 1000 * 60 * 5); // 5 minutes

