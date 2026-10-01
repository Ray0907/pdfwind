// Codepoints the CJK face is for; a render whose text has none of these never loads the 5 MB file.
export const CJK_RANGES = [[0x2e80, 0x2fdf], [0x3000, 0x30ff], [0x3100, 0x312f], [0x31c0, 0x31ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xf900, 0xfaff], [0xfe30, 0xfe4f], [0xff00, 0xffef]];

// the italic face is only registered when the markup uses italics (class or style or <em>/<i>)
export const ITALIC_WHEN = /\bitalic\b|font-style:\s*italic|<(?:em|i)[\s>]/;
