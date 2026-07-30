// src/utils/imageUtils.js

/**
 * 压缩图片为 Base64
 */
export const compressImage = (file, maxWidth, maxHeight, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * 裁剪图片（圆形/矩形裁剪）
 */
export const cropImage = (imageSrc, cropType, zoom, pos) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const isAvatar = cropType === 'avatar';
      const canvas = document.createElement("canvas");
      canvas.width = 280;
      canvas.height = 280;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, 280, 280);

      let renderW = img.width, renderH = img.height;
      const ratio = Math.min(280 / renderW, 280 / renderH);
      renderW *= ratio;
      renderH *= ratio;

      ctx.save();
      ctx.translate(140 + pos.x, 140 + pos.y);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();

      const cropW = isAvatar ? 180 : 150;
      const cropH = isAvatar ? 180 : 220;
      const targetW = isAvatar ? 150 : 400;
      const targetH = isAvatar ? 150 : 600;

      const cropX = 140 - cropW / 2;
      const cropY = 140 - cropH / 2;

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetW;
      finalCanvas.height = targetH;
      const finalCtx = finalCanvas.getContext("2d");
      finalCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      resolve(finalCanvas.toDataURL("image/jpeg", 0.85));
    };
  });
};

/**
 * 生成兜底图片
 */
export const getFallbackImg = (width = 300, height = 300) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText("PainScape Somatic Space", width / 2, height / 2 + 4);
  return canvas.toDataURL("image/jpeg", 0.5);
};