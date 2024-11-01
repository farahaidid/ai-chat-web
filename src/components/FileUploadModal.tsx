import React, { useCallback, useState } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import client from '../api/client';

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (response: any) => void;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ open, onClose, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PDF, DOCX, or TXT files only.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: new Date().toISOString()
      }));

      const response = await client.post('/document-embedding/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(`File "${file.name}" uploaded successfully!`);
      onUploadSuccess(response.data);
      
      // Close modal after successful upload
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);

    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [onClose, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Upload Document
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover'
            }
          }}
        >
          <input {...getInputProps()} />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            {uploading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Typography variant="h6" component="div">
                  {isDragActive
                    ? 'Drop the file here'
                    : 'Drag and drop a file here, or click to select'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: PDF, DOCX, TXT
                </Typography>
              </>
            )}
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadModal;