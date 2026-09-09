const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/USER/Downloads/dece-app/public/situational_media';
const dstDir = 'C:/Users/USER/Downloads/dece-app/public';

['image1.png', 'image2.png', 'image3.jpg'].forEach(f => {
  const src = path.join(srcDir, f);
  const dst = path.join(dstDir, `mineduc_sit_${f}`);
  fs.copyFileSync(src, dst);
  console.log(`Copied ${src} -> ${dst} (${fs.statSync(dst).size} bytes)`);
});
