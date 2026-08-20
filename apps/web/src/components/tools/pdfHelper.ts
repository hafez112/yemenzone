// 📄 مساعدات PDF مشتركة — تحويل عنصر HTML (عربي RTL) إلى PDF عبر canvas
export async function elementToPdf(el: HTMLElement, filename: string, opts?: { widthMm?: number }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const img = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, pageH = 297, margin = 8;
  const w = opts?.widthMm || pageW - margin * 2;
  const h = (canvas.height / canvas.width) * w;
  if (h <= pageH - margin * 2) {
    pdf.addImage(img, 'JPEG', margin, margin, w, h);
  } else {
    // تقسيم على صفحات
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d')!;
    const sliceH = Math.floor((canvas.width / w) * (pageH - margin * 2));
    let y = 0, first = true;
    while (y < canvas.height) {
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(sliceH, canvas.height - y);
      ctx.drawImage(canvas, 0, y, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
      if (!first) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, (pageCanvas.height / canvas.width) * w);
      y += sliceH; first = false;
    }
  }
  pdf.save(filename);
}

// قراءة ملف صورة كـ dataURL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export const fmtN = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
