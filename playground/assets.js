// 120x60 test image: red left half, blue right half, 20x20 green square in the top-left corner
export const TEST_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAHgAAAA8CAIAAAAiz+n/AAAAqElEQVR4nO3QQQ3CAABFsRnhiBd8YBYbnDGBhx32/pImVdDj+BynfR+vxPP9u53zy6JFLxItWrRo0btEixYtWvQu0aJFixa9S7Ro0aJF7xJ9VXSVJfoG8jXRu0SLFp3L10TvEi1adC5fE71LtGjRuXxN9C7RokXn8jXRu0SLFp3L10TvEi1adC5fE71LtGjRuXxN9C7RokXn8jXRu0SLFp3L10TvEn2RP5SDhtxdpGy3AAAAAElFTkSuQmCC";
export const TEST_PNG = `data:image/png;base64,${TEST_PNG_B64}`;
export const testPngBytes = () => Uint8Array.from(atob(TEST_PNG_B64), (c) => c.charCodeAt(0));
