export type LegalKey = 'compliance' | 'privacy' | 'terms';

export interface LegalDoc {
  key: LegalKey;
  title: string;
  storageKey: string;
  intro: string;
  sections: { heading: string; body: string }[];
}

export const LEGAL_DOCS: Record<LegalKey, LegalDoc> = {
  compliance: {
    key: 'compliance',
    title: 'Cumplimiento Normativo',
    storageKey: 'wax_compliance_accepted',
    intro:
      'WAXAPP opera 100% dentro del marco legal mexicano vigente, bajo los amparos otorgados por la SCJN y las regulaciones sanitarias aplicables.',
    sections: [
      {
        heading: 'Marco regulatorio',
        body:
          'Comercializamos derivados industriales del cáñamo (Cannabis sativa L.) con concentraciones de THC menores al 1%, conforme a la Ley General de Salud y los acuerdos publicados en el DOF. Nuestros productos cuentan con análisis de laboratorio (Certificate of Analysis) emitidos por terceros independientes.',
      },
      {
        heading: 'Normas sanitarias',
        body:
          'Cumplimos con NOM-251-SSA1-2009 (prácticas de higiene en alimentos y bebidas), NOM-051-SCFI/SSA1-2010 (etiquetado) y NOM-247-SSA1 cuando aplica. Las áreas de producción son sanitizadas y nuestro personal está capacitado.',
      },
      {
        heading: 'Edad mínima',
        body:
          'La venta está restringida a mayores de 18 años. El comprador acepta bajo protesta de decir verdad cumplir con la edad mínima al confirmar su pedido.',
      },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'Aviso de Privacidad',
    storageKey: 'wax_privacy_accepted',
    intro:
      'En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), te informamos cómo tratamos tu información.',
    sections: [
      {
        heading: 'Responsable',
        body:
          'WAXAPP, con domicilio en México, es responsable del tratamiento de tus datos personales. Para cualquier solicitud ARCO escríbenos a privacidad@waxapp.mx.',
      },
      {
        heading: 'Datos recabados',
        body:
          'Nombre, correo electrónico, teléfono, dirección de envío, RFC (si solicitas factura) y datos de pago (procesados directamente por Clip — nunca almacenados en nuestros servidores).',
      },
      {
        heading: 'Finalidades',
        body:
          'Procesar pedidos, emitir CFDI, coordinar envíos, atención al cliente, comunicación promocional (con tu consentimiento), análisis estadístico y cumplimiento de obligaciones fiscales.',
      },
      {
        heading: 'Transferencias',
        body:
          'Compartimos datos sólo con paqueterías (DHL, Estafeta, FedEx), proveedores de pago certificados (Clip) y autoridades fiscales cuando lo requieran. No vendemos tus datos a terceros.',
      },
      {
        heading: 'Tus derechos',
        body:
          'Puedes ejercer tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) en cualquier momento enviando un correo a privacidad@waxapp.mx con copia de identificación oficial.',
      },
    ],
  },
  terms: {
    key: 'terms',
    title: 'Términos y Condiciones de Venta',
    storageKey: 'wax_terms_accepted',
    intro:
      'Al realizar una compra en WAXAPP aceptas los siguientes términos. Te recomendamos leerlos con atención.',
    sections: [
      {
        heading: 'Productos y restricciones',
        body:
          'Todos nuestros productos están destinados a personas mayores de 18 años. No se vende a mujeres embarazadas, en lactancia, ni a personas con condiciones médicas sin supervisión profesional. Los productos no diagnostican, tratan o curan ninguna enfermedad.',
      },
      {
        heading: 'Precios y facturación',
        body:
          'Todos los precios están en pesos mexicanos (MXN) e incluyen IVA. Emitimos CFDI 4.0 al solicitarlo dentro del mismo mes de la compra. Los precios pueden cambiar sin previo aviso.',
      },
      {
        heading: 'Envíos',
        body:
          'Realizamos envíos a toda la República Mexicana en empaque 100% discreto sin logos ni descripciones. El tiempo de entrega es de 2 a 7 días hábiles. Si tu paquete se extravía en tránsito, lo reponemos sin costo (aplican condiciones).',
      },
      {
        heading: 'Devoluciones',
        body:
          'Por tratarse de productos consumibles e higiénicos, no se aceptan devoluciones una vez que el empaque ha sido abierto. En caso de defecto de fabricación o producto incorrecto, tienes 7 días naturales desde la recepción para reportarlo a soporte@waxapp.mx.',
      },
      {
        heading: 'Limitación de responsabilidad',
        body:
          'WAXAPP no se hace responsable por el mal uso de los productos ni por reacciones individuales. El cliente asume la responsabilidad del consumo y se compromete a no conducir vehículos ni operar maquinaria bajo los efectos.',
      },
    ],
  },
};
