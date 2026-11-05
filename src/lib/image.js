/** 사진을 최대 1800px, JPEG 0.85로 줄여요. 실패하면 {code:"decode"} 를 던져요. */
export async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const max = 1800;
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const out = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    if (out && out.size) return out;
  } catch (e) {
    /* 아래에서 decode 에러로 처리 */
  } finally {
    URL.revokeObjectURL(url);
  }
  throw { code: "decode" };
}
