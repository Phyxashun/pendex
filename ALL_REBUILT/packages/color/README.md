# 🎨 How Colors Is Used

`Colors` is designed to be a highly performant, zero-dependency
utility for formatting terminal text with standard ANSI and 24-bit
Truecolor escape sequences.

## Basic Text Styling

To style text, pass your string directly into any of the static styler
properties:

```ts
import { Colors } from './Colors';

console.log(Colors.red('This text is red!'));
console.log(Colors.bold('This text is bold!'));
```

## Nested Styling

Just like `picocolors`, nesting styles of the same family is fully
supported. If a nested style is found, the class dynamically replaces
the closing tag so that styling resumes correctly afterwards:

```ts
// Inside the red text, "bold and underlined" is nested
console.log(Colors.red(`Normal red ${Colors.underline('underlined
red')} back to normal red`));
```

## 24-Bit Truecolor (Hex & bgHex)

You can dynamically create RGB foreground and background stylers using
hex codes:

```ts
const customOrange = Colors.hex('#ff8800');
const customBg = Colors.bgHex('333'); // Leading # is optional

console.log(customOrange('Custom 24-bit orange text'));
console.log(customBg('Dark grey background text'));
```

## Environment Controls

You can programmatically force ANSI styling on or off regardless of
the detected terminal environment:

```ts
Colors.disable(); // All stylers will now return plain, unmodified strings
Colors.enable(); // Force colors back on
```
