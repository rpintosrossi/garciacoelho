'use client';

import React, { useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { PictureAsPdf, Image, Description } from '@mui/icons-material';

interface FileViewerProps {
  fileUrl: string;
  alt?: string;
  width?: number;
  height?: number;
}

const FileViewer: React.FC<FileViewerProps> = ({ 
  fileUrl, 
  alt = "Archivo", 
  width = 80, 
  height = 80 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const getFileType = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    return 'document';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <PictureAsPdf sx={{ fontSize: 40, color: '#d32f2f' }} />;
      case 'image':
        return <Image sx={{ fontSize: 40, color: '#1976d2' }} />;
      default:
        return <Description sx={{ fontSize: 40, color: '#666' }} />;
    }
  };

  const getFileTypeText = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return 'PDF';
      case 'image':
        return 'Imagen';
      default:
        return 'Documento';
    }
  };

  const fileType = getFileType(fileUrl);

  return (
    <a 
      href={fileUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <Paper
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: '#1976d2',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        {fileType === 'image' && !imageError ? (
          <img 
            src={fileUrl} 
            alt={alt}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '4px'
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            {getFileIcon(fileType)}
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 0.5, 
                fontSize: '10px',
                color: '#666'
              }}
            >
              {getFileTypeText(fileType)}
            </Typography>
          </Box>
        )}
      </Paper>
    </a>
  );
};

export default FileViewer;
