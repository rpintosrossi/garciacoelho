const fs = require('fs');
const path = require('path');

const initUploads = () => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Carpeta de uploads creada en:', uploadsDir);
  }
};

module.exports = initUploads; 