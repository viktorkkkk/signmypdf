export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#334155' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Политика конфиденциальности
      </h1>
      
      <p style={{ marginBottom: 16 }}>
        Настоящая Политика конфиденциальности описывает, как ИП/ООО «СайнМайПДФ» 
        (далее — «мы», «нас» или «наш») собирает, использует и защищает информацию 
        при использовании нашего онлайн-сервиса для подписания PDF-документов.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        1. Обработка данных
      </h2>
      <p style={{ marginBottom: 16 }}>
        1.1. Все операции с PDF-документами выполняются исключительно в браузере пользователя. 
        Мы не загружаем, не храним и не обрабатываем ваши документы на наших серверах.
      </p>
      <p style={{ marginBottom: 16 }}>
        1.2. История документов и подписи сохраняются локально в браузере пользователя 
        с помощью localStorage и не передаются на наши серверы.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        2. Какие данные мы собираем
      </h2>
      <p style={{ marginBottom: 16 }}>
        2.1. Мы не требуем регистрации и не собираем персональные данные пользователей.
      </p>
      <p style={{ marginBottom: 16 }}>
        2.2. Мы можем собирать анонимную статистику использования Сервиса 
        (количество подписанных документов, типы ошибок) для улучшения работы Сервиса.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        3. Использование файлов cookie
      </h2>
      <p style={{ marginBottom: 16 }}>
        3.1. Мы используем cookie и localStorage только для технического функционирования 
        Сервиса (сохранение настроек, истории документов).
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        4. Безопасность
      </h2>
      <p style={{ marginBottom: 16 }}>
        4.1. Мы принимаем все необходимые меры для защиты данных пользователей. 
        Поскольку все данные хранятся локально в браузере пользователя, 
        безопасность обеспечивается на стороне пользователя.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        5. Изменения в политике
      </h2>
      <p style={{ marginBottom: 16 }}>
        5.1. Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. 
        Обновленная версия публикуется на этой странице.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginTop: 32, marginBottom: 16 }}>
        6. Контакты
      </h2>
      <p style={{ marginBottom: 16 }}>
        По вопросам, связанным с настоящей Политикой конфиденциальности, 
        пожалуйста, свяжитесь с нами: support@signmypdf.app
      </p>

      <p style={{ marginTop: 32, fontSize: 14, color: '#64748b' }}>
        Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
      </p>
    </div>
  );
}
