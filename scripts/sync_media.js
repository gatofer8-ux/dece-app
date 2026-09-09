const fs = require('fs');

fs.copyFileSync('C:/Users/USER/Downloads/dece-app/public/situational_media/image1.png', 'C:/Users/USER/Downloads/dece-app/public/mineduc_sit_image1.png');
fs.copyFileSync('C:/Users/USER/Downloads/dece-app/public/situational_media/image2.png', 'C:/Users/USER/Downloads/dece-app/public/mineduc_sit_image2.png');
fs.copyFileSync('C:/Users/USER/Downloads/dece-app/public/situational_media/image3.jpg', 'C:/Users/USER/Downloads/dece-app/public/mineduc_sit_image3.jpg');

console.log('Successfully copied all situational media images to public/');
