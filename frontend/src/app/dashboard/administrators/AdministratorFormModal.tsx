import React, { useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useFormik } from "formik";
import * as Yup from "yup";
import api, { cachedApi } from '@/lib/axios';

interface Administrator {
  id: string;
  name: string;
  administratorName?: string;
  email: string;
  phone: string;
  phones?: string[];
  phoneNames?: string[];
  emails?: string[];
  emailNames?: string[];
  officeAddress?: string;
}

interface AdministratorFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Administrator | null;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onAdministratorCreated?: (admin: Administrator) => void;
}

const validationSchema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  administratorName: Yup.string(),
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  phone: Yup.string().required("El teléfono es obligatorio"),
  phones: Yup.array().of(Yup.string()),
  phoneNames: Yup.array().of(Yup.string()),
  emails: Yup.array().of(Yup.string().email("Email inválido")),
  emailNames: Yup.array().of(Yup.string()),
  officeAddress: Yup.string(),
});

const AdministratorFormModal: React.FC<AdministratorFormModalProps> = ({
  open,
  onClose,
  editing,
  onSuccess,
  onError,
  onAdministratorCreated
}) => {
  const formik = useFormik({
    initialValues: {
      name: "",
      administratorName: "",
      email: "",
      phone: "",
      phones: [],
      phoneNames: [],
      emails: [],
      emailNames: [],
      officeAddress: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        const token = localStorage.getItem("token");
        let response;
        if (editing) {
          response = await api.put(`/administrators/${editing.id}`, values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          onSuccess("Administrador actualizado");
        } else {
          response = await api.post("/administrators", values, {
            headers: { Authorization: `Bearer ${token}` },
          });
          onSuccess("Administrador creado");
          if (onAdministratorCreated) {
            onAdministratorCreated(response.data);
          }
        }
        // Limpiar caché
        cachedApi.clearCacheFor('/administrators');
        
        // Reset form and close handled by parent or effect
        formik.resetForm();
        onClose();
      } catch (error: any) {
        onError(error?.response?.data?.message || "Error al guardar");
      }
    },
  });

  // Efecto para actualizar los valores iniciales cuando cambia "editing"
  useEffect(() => {
    if (open) {
      if (editing) {
        formik.setValues({
          name: editing.name || "",
          administratorName: editing.administratorName || "",
          email: editing.email || "",
          phone: editing.phone || "",
          phones: editing.phones || [],
          phoneNames: editing.phoneNames || [],
          emails: editing.emails || [],
          emailNames: editing.emailNames || [],
          officeAddress: editing.officeAddress || "",
        });
      } else {
        formik.resetForm();
      }
    }
  }, [editing, open]); // Removed formik from deps to avoid infinite loop

  const handleCloseModal = () => {
    if (formik.dirty) {
      const confirmClose = window.confirm(
        "Hay cambios sin guardar. ¿Estás seguro de que deseas cerrar?"
      );
      if (!confirmClose) {
        return;
      }
    }
    formik.resetForm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseModal}
      disableEscapeKeyDown={formik.dirty}
      fullWidth 
      maxWidth="sm"
    >
      <DialogTitle>
        {editing ? "Editar Administrador" : "Nuevo Administrador"}
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nombre"
            name="name"
            fullWidth
            value={formik.values.name}
            onChange={formik.handleChange}
            error={formik.touched.name && Boolean(formik.errors.name)}
            helperText={formik.touched.name && formik.errors.name}
          />
          <TextField
            margin="dense"
            label="Nombre del Administrador"
            name="administratorName"
            fullWidth
            value={formik.values.administratorName}
            onChange={formik.handleChange}
            error={formik.touched.administratorName && Boolean(formik.errors.administratorName)}
            helperText={formik.touched.administratorName && formik.errors.administratorName}
          />
          <TextField
            margin="dense"
            label="Email"
            name="email"
            type="email"
            fullWidth
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <TextField
            margin="dense"
            label="Teléfono"
            name="phone"
            fullWidth
            value={formik.values.phone}
            onChange={formik.handleChange}
            error={formik.touched.phone && Boolean(formik.errors.phone)}
            helperText={formik.touched.phone && formik.errors.phone}
          />
          <TextField
            margin="dense"
            label="Dirección Oficina"
            name="officeAddress"
            fullWidth
            value={formik.values.officeAddress}
            onChange={formik.handleChange}
            error={formik.touched.officeAddress && Boolean(formik.errors.officeAddress)}
            helperText={formik.touched.officeAddress && formik.errors.officeAddress}
          />
          
          {/* Teléfonos adicionales */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Teléfonos Adicionales</Typography>
          {formik.values.phones && formik.values.phones.map((phone, index) => (
            <Box key={index} display="flex" gap={2} sx={{ mb: 1 }}>
              <TextField
                label={`Teléfono ${index + 1}`}
                value={phone}
                onChange={(e) => {
                  const newPhones = [...(formik.values.phones || [])];
                  newPhones[index] = e.target.value;
                  formik.setFieldValue('phones', newPhones);
                }}
                sx={{ flex: 1 }}
                size="small"
              />
              <TextField
                label={`Nombre ${index + 1}`}
                value={formik.values.phoneNames?.[index] || ''}
                onChange={(e) => {
                  const newPhoneNames = [...(formik.values.phoneNames || [])];
                  newPhoneNames[index] = e.target.value;
                  formik.setFieldValue('phoneNames', newPhoneNames);
                }}
                sx={{ flex: 1 }}
                size="small"
              />
              <IconButton
                color="error"
                onClick={() => {
                  const newPhones = (formik.values.phones || []).filter((_, i) => i !== index);
                  const newPhoneNames = (formik.values.phoneNames || []).filter((_, i) => i !== index);
                  formik.setFieldValue('phones', newPhones);
                  formik.setFieldValue('phoneNames', newPhoneNames);
                }}
                size="small"
              >
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              formik.setFieldValue('phones', [...(formik.values.phones || []), '']);
              formik.setFieldValue('phoneNames', [...(formik.values.phoneNames || []), '']);
            }}
            sx={{ mt: 1, mb: 2 }}
          >
            + Agregar Teléfono
          </Button>
          
          {/* Emails adicionales */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Emails Adicionales</Typography>
          {formik.values.emails && formik.values.emails.map((email, index) => (
            <Box key={index} display="flex" gap={2} sx={{ mb: 1 }}>
              <TextField
                label={`Email ${index + 1}`}
                type="email"
                value={email}
                onChange={(e) => {
                  const newEmails = [...(formik.values.emails || [])];
                  newEmails[index] = e.target.value;
                  formik.setFieldValue('emails', newEmails);
                }}
                sx={{ flex: 1 }}
                size="small"
              />
              <TextField
                label={`Nombre ${index + 1}`}
                value={formik.values.emailNames?.[index] || ''}
                onChange={(e) => {
                  const newEmailNames = [...(formik.values.emailNames || [])];
                  newEmailNames[index] = e.target.value;
                  formik.setFieldValue('emailNames', newEmailNames);
                }}
                sx={{ flex: 1 }}
                size="small"
              />
              <IconButton
                color="error"
                onClick={() => {
                  const newEmails = (formik.values.emails || []).filter((_, i) => i !== index);
                  const newEmailNames = (formik.values.emailNames || []).filter((_, i) => i !== index);
                  formik.setFieldValue('emails', newEmails);
                  formik.setFieldValue('emailNames', newEmailNames);
                }}
                size="small"
              >
                <Delete />
              </IconButton>
            </Box>
          ))}
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              formik.setFieldValue('emails', [...(formik.values.emails || []), '']);
              formik.setFieldValue('emailNames', [...(formik.values.emailNames || []), '']);
            }}
            sx={{ mt: 1 }}
          >
            + Agregar Email
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancelar</Button>
          <Button type="submit" variant="contained">
            {editing ? "Actualizar" : "Crear"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AdministratorFormModal;