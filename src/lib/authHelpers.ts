import axios from 'axios';

export const phoneToEmail = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `${cleanPhone}@wcatalog.app`;
};

export const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationCode = async (
  phone: string,
  code: string,
  evolutionUrl: string,
  apiKey: string,
  instanceName: string
) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const url = `${evolutionUrl}/message/sendText/${instanceName}`;
  
  if (!evolutionUrl || !instanceName || !apiKey) {
    console.error('Missing Evolution API configuration:', { evolutionUrl, instanceName, apiKey });
    throw new Error('Configuración de WhatsApp incompleta');
  }

  try {
    console.log('Sending WhatsApp message to:', cleanPhone, 'via', url);
    await axios.post(
      url,
      {
        number: cleanPhone,
        text: `Tu código de verificación es: ${code}`,
        delay: 1200,
        linkPreview: false
      },
      {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Evolution API Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
    } else {
      console.error('Evolution API Error:', error);
    }
    throw new Error('No se pudo enviar el mensaje por WhatsApp');
  }
};
