import stylesheet from '../components/cvPaper.css?raw';

export async function printCv(paper, title) {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;inset:0';
  document.body.append(frame);
  try {
    const printable = frame.contentDocument;
    printable.title = title;
    printable.documentElement.lang = paper.lang;
    printable.documentElement.dir = paper.dir;
    printable.body.className = 'cv-print-document';
    const style = printable.createElement('style');
    style.textContent = stylesheet;
    printable.head.append(style);
    printable.body.append(printable.importNode(paper, true));
    await Promise.all([...printable.images].map((image) => Promise.race([
      image.decode().catch(() => image.remove()),
      new Promise((resolve) => setTimeout(() => {
        if (!image.complete) image.remove();
        resolve();
      }, 1500)),
    ])));
    frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
    frame.contentWindow.print();
  } catch (error) {
    frame.remove();
    throw error;
  }
}
