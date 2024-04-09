# L10n Breaks

There are lots of ways to determine where linebreaks in text could go, and that can vary a lot by language.

This package provides helpers for various linebreak cases.

Supported cases:

- **Chinese & Japanese**: `splitOnBreakpoints` breaks on ideographs while ensuring that punctuation is attached to the appropriate adjacent character, and splits non-CJ text on spaces and other punctuation (also attaching the punctuation to the appropriate side of the split).

## Usage

```typescript
import { splitOnBreakpoints } from '@bscotch/l10n-breaks';

console.log(
  splitOnBreakpoints(
    '记得长大后学习怎么12345 hello。用锤子的时候，第一课就是学会站稳脚跟。如果站不稳，那就永远都打不准。有时候往往是那些微不足道的小事，能帮你重新找到立足点。',
  ),
);
```

Returns:

```js
[
  '记',
  '得',
  '长',
  '大',
  '后',
  '学',
  '习',
  '怎',
  '么',
  '12345 ',
  'hello。',
  '用',
  '锤',
  '子',
  '的',
  '时',
  '候，',
  '第',
  '一',
  '课',
  '就',
  '是',
  '学',
  '会',
  '站',
  '稳',
  '脚',
  '跟。',
  '如',
  '果',
  '站',
  '不',
  '稳，',
  '那',
  '就',
  '永',
  '远',
  '都',
  '打',
  '不',
  '准。',
  '有',
  '时',
  '候',
  '往',
  '往',
  '是',
  '那',
  '些',
  '微',
  '不',
  '足',
  '道',
  '的',
  '小',
  '事，',
  '能',
  '帮',
  '你',
  '重',
  '新',
  '找',
  '到',
  '立',
  '足',
  '点。',
];
```
