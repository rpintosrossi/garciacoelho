const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const s3Client = require('../config/s3');

// Determinar si usar S3 o almacenamiento local
const USE_S3 = process.env.USE_S3 === 'true';

let storage;

if (USE_S3) {
  // Configuración de almacenamiento en S3
  storage = multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    // No usar ACL - el bucket no los permite
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
      cb(null, filename);
    }
  });
} else {
  // Configuración de almacenamiento local (por defecto)
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Aceptar imágenes y PDFs
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
      return cb(new Error('Solo se permiten archivos de imagen o PDF'));
    }
    cb(null, true);
  }
});

module.exports = upload;

