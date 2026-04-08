export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Публичная оферта
      </h1>
      
      <p style={{ marginBottom: 16 }}>
        Настоящий документ является публичной офертой (предложением) ИП/ООО «СайнМайПДФ» 
        заключить договор об оказании услуг на изложенных ниже условиях.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. Общие положения
      </h2>
      <p style={{ marginBottom: 16 }}>
        1.1. Настоящая публичная оферта (далее — «Оферта») является официальным предложением 
        ИП/ООО «СайнМайПДФ» (далее — «Исполнитель») любому физическому или юридическому лицу 
        (далее — «Заказчик») заключить договор об оказании услуг.
      </p>
      <p style={{ marginBottom: 16 }}>
        1.2. Акцептом настоящей Оферты является факт использования Сервиса Заказчиком.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. Предмет договора
      </h2>
      <p style={{ marginBottom: 16 }}>
        2.1. Исполнитель предоставляет Заказчику доступ к онлайн-сервису для подписания 
        PDF-документов (далее — «Сервис»).
      </p>
      <p style={{ marginBottom: 16 }}>
        2.2. Услуги предоставляются на безвозмездной основе.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. Права и обязанности сторон
      </h2>
      <p style={{ marginBottom: 16 }}>
        3.1. Исполнитель обязуется поддерживать работоспособность Сервиса.
      </p>
      <p style={{ marginBottom: 16 }}>
        3.2. Заказчик обязуется не использовать Сервис для незаконных целей.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. Ответственность
      </h2>
      <p style={{ marginBottom: 16 }}>
        4.1. Исполнитель не несет ответственности за содержание документов, 
        обрабатываемых через Сервис.
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: '#64748b' }}>
        Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
      </p>
    </div>
  );
}
