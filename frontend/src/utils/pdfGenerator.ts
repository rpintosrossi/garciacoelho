import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePaymentMethodPDF = async (paymentMethod: {
  name: string;
  titular?: string;
  banco?: string;
  cuenta?: string;
  cuit?: string;
  cbu?: string;
  alias?: string;
}) => {
  // Crear un elemento temporal para renderizar el contenido
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '40px';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.color = 'black';
  tempDiv.style.fontSize = '14px';
  tempDiv.style.lineHeight = '1.6';

  tempDiv.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px; padding: 20px; border-bottom: 2px solid #1976d2;">
      <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px;">
        <img src="/logo.png" alt="Logo Garcia Coelho" style="width: 200px; height: auto; display: block;">
      </div>
    </div>
    
    <div style="margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #1976d2;">
      <p style="margin: 8px 0; font-size: 16px;"><strong>Dirección:</strong> Av. San Martín 1234, CABA</p>
      <p style="margin: 8px 0; font-size: 16px;"><strong>Casilla de mail:</strong> garciacoelho@hotmail.com</p>
      <p style="margin: 8px 0; font-size: 16px;"><strong>Whatsapp:</strong> 1138341046</p>
    </div>
    
    <div style="border: 3px solid #1976d2; padding: 25px; margin: 25px 0; border-radius: 12px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);">
      
      <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
        <strong style="color: #1976d2; font-size: 16px;">Titular:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.titular || 'No especificado'}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
        <strong style="color: #1976d2; font-size: 16px;">Banco:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.banco || 'No especificado'}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
        <strong style="color: #1976d2; font-size: 16px;">Cuenta:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.cuenta || 'No especificado'}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
        <strong style="color: #1976d2; font-size: 16px;">CUIT:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.cuit || 'No especificado'}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
        <strong style="color: #1976d2; font-size: 16px;">CBU:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.cbu || 'No especificado'}</span>
      </div>
      
      <div style="margin-bottom: 12px; padding: 8px 0;">
        <strong style="color: #1976d2; font-size: 16px;">Alias:</strong> 
        <span style="font-size: 16px; margin-left: 10px;">${paymentMethod.alias || 'No especificado'}</span>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 35px; padding: 25px; background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); border-radius: 12px; color: white;">
      <p style="margin: 0 0 20px 0; font-weight: bold; font-size: 18px; text-transform: uppercase;">Por favor enviar comprobante al e-mail o al Whatsapp</p>
      <div style="display: flex; justify-content: space-around; flex-wrap: wrap;">
        <div style="margin: 10px;">
          <p style="margin: 5px 0; font-size: 16px;"><strong>Mail:</strong></p>
          <p style="margin: 5px 0; font-size: 16px;">garciacoelho@hotmail.com</p>
        </div>
        <div style="margin: 10px;">
          <p style="margin: 5px 0; font-size: 16px;"><strong>Whatsapp:</strong></p>
          <p style="margin: 5px 0; font-size: 16px;">1138341046</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(tempDiv);

  try {
    // Convertir el HTML a canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Crear el PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Agregar páginas adicionales si es necesario
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Descargar el PDF
    pdf.save(`${paymentMethod.name.replace(/[^a-zA-Z0-9]/g, '_')}_datos_pago.pdf`);
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv);
  }
};
