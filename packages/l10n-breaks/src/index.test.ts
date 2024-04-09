import { splitOnBreakpoints } from './index.js';
import { ok } from 'assert';

const samples = {
  en: [
    {
      src: 'Hello, world! This is some "sample text," with various punctuation situations: like super-long words and contract\'ed ones!?',
    },
  ],
  'zh-CN': [
    {
      src: '记得长大后学习怎么12345 hello。用锤子的时候，第一课就是学会站稳脚跟。如果站不稳，那就永远都打不准。有时候往往是那些微不足道的小事，能帮你重新找到立足点。',
    },
    {
      src: '我一般不会指望陌生人的善意。陌生人可能会把你的家给炸了，也可能会提供一顿美餐或一个温暖的花盆，让你能够安心地舒展根系。但时局艰难的时候，他人的善意并不可靠。如果有什么可以确定的事，那就是困难总会来临。',
    },
    {
      src: '我的鲸群主母说过：“家，就是心灵停靠的中心洞穴。”家就在岩洞中回荡着的鲸鱼的歌声中，在深海洋流的低沉鼓动中，在锤子捶打金属那有规律的敲击声中。有趣的是……我还在那儿的时候，总是觉得很吵。但是现在，我开始怀念那些噪音了。',
    },
    {
      src: '我不想成为别人的依靠。不想让他们习惯于向我寻求帮助。因为一旦人们开始对你有所期待，也就有可能会对你失望。你在他们心里的位置越高，摔下来的时候就越重。',
    },
  ],
} satisfies { [lang: string]: { src: string }[] };

describe('splitOnEveryCharacter', () => {
  const langs = Object.keys(samples) as (keyof typeof samples)[];
  for (const lang of langs) {
    for (const sample of samples[lang]) {
      it(`should split ${lang} into individual characters`, () => {
        const result = splitOnBreakpoints(sample.src);
        ok(result.join('') === sample.src);
        console.log(result);
      });
    }
  }
});
