const Footer = () => {
  return (
    <footer style={{ 
      backgroundColor: '#666', 
      padding: '15px 0 10px',
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1.4',
      fontSize: '13px'
    }}>
      <div style={{ 
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        padding: '0 10px'
      }}>
        {/* Logo Section */}
        <div style={{ 
          flex: '0 0 100px',
          textAlign: 'center',
          marginBottom: '10px',
          padding: '0 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="https://www.fesc.edu.co/portal/images/footer/icontec-fesc.png" 
            alt="ICONTEC FESC"
            style={{ 
              width: '90px',
              height: 'auto',
              marginBottom: '8px'
            }} 
          />
        </div>
        
        {/* Sede Cúcuta */}
        <div style={{ 
          flex: '1 0 200px',
          padding: '0 10px',
          marginBottom: '10px'
        }}>
          <h3 style={{ 
            color: '#fff',
            fontSize: '15px',
            margin: '5px 0 8px',
            fontWeight: '600',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '4px'
          }}>
            Sede Cúcuta
          </h3>
          <div style={{ color: '#fff', fontSize: '12px', marginBottom: '10px' }}>
            <p style={{ margin: '8px 0' }}>Av 5 # 15-27, Centro</p>
            <p style={{ margin: '8px 0' }}>PBX +57 607 5880091 ext 101 102 103</p>
            <p style={{ margin: '8px 0' }}>312 354 1578 / 313 386 0356</p>
          </div>
          
          <h3 style={{ 
            color: '#fff',
            fontSize: '18px',
            margin: '10px 0 8px',
            fontWeight: '600',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '8px'
          }}>
            Sede Ocaña
          </h3>
          <div style={{ color: '#fff', fontSize: '14px' }}>
            <p style={{ margin: '8px 0' }}>Kdx 194-785, Vía Universitaria</p>
            <p style={{ margin: '8px 0' }}>PBX +57 607 5880091 ext 203</p>
            <p style={{ margin: '8px 0' }}>313 386 1614</p>
          </div>
        </div>
        
        {/* Información Institucional */}
        <div style={{ 
          flex: '2 0 250px',
          padding: '0 10px',
          marginBottom: '10px'
        }}>
          <h2 style={{ 
            color: '#fff',
            fontSize: '15px',
            margin: '5px 0 8px',
            fontWeight: '600',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '4px'
          }}>
            Fundación de Estudios Superiores Comfanorte
          </h2>
          
          <p style={{ 
            color: 'rgba(255,255,255,0.9)',
            fontSize: '12px',
            marginBottom: '8px',
            textAlign: 'justify',
            lineHeight: '1.4'
          }}>
            Institución de Educación Superior de carácter Tecnológico de derecho privado, de utilidad común y sin ánimo de lucro, redefinida mediante Resolución del MEN 747 del 19 de febrero de 2009, para ofertar programas Técnicos, Tecnológicos, Profesionales y Especializaciones.
          </p>
          
          <p style={{ 
            color: 'rgba(255,255,255,0.9)',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'justify',
            lineHeight: '1.6'
          }}>
            Su oferta académica se desarrolla en el Departamento Norte de Santander, específicamente en los municipios de San José de Cúcuta y en la Provincia de Ocaña.
          </p>
          
          <div style={{ textAlign: 'center' }}>
            <a 
              href="/portal/archivos/reglamentos/personeria_juridica.pdf" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#fff',
                textDecoration: 'none',
                fontSize: '11px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '4px 10px',
                borderRadius: '3px',
                display: 'inline-block',
                transition: 'all 0.2s ease'
              }}
            >
              Personería Jurídica: Resolución 04172 del 25 de agosto de 1993
            </a>
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div style={{ 
        textAlign: 'center',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '11px',
        marginTop: '10px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        © {new Date().getFullYear()} Fundación de Estudios Superiores Comfanorte. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
