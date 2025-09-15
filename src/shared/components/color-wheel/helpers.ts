export const EVENT = {
  START: 'touchstart',
  MOVE: 'touchmove',
  STOP: 'touchend'
};

export const getPixelRatio = (context): number => {
  const dpr = window.devicePixelRatio || 1;

  const bsr =
    context.webkitBackingStorePixelRatio ||
    context.mozBackingStorePixelRatio ||
    context.msBackingStorePixelRatio ||
    context.oBackingStorePixelRatio ||
    context.backingStorePixelRatio ||
    1;

  return dpr / bsr;
};

export const toHex = (num): string => {
  num = parseInt(num, 10);

  if (isNaN(num)) {
    return '00';
  }

  num = Math.max(0, Math.min(num, 255));

  return (
    '0123456789ABCDEF'.charAt((num - (num % 16)) / 16) +
    '0123456789ABCDEF'.charAt(num % 16)
  );
};
