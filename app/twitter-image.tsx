import { ImageResponse } from 'next/og';

export const alt = 'SignMyPDF — Sign & Fill PDFs Free. No Registration.';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '140px',
              background: 'white',
              borderRadius: '8px',
              border: '3px solid #d1d5db',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              padding: '18px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.15)',
            }}
          >
            <div
              style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '22px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '4px',
              }}
            >
              PDF
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 800,
                color: '#1f2937',
                lineHeight: 1,
                letterSpacing: '-2px',
              }}
            >
              SignMyPDF
            </div>
            <div
              style={{
                fontSize: '28px',
                color: '#2563eb',
                fontWeight: 600,
                marginTop: '8px',
              }}
            >
              .io
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: '#111827',
            textAlign: 'center',
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: '24px',
          }}
        >
          Sign & Fill PDFs in Seconds
        </div>

        <div
          style={{
            fontSize: '30px',
            color: '#4b5563',
            textAlign: 'center',
            fontWeight: 500,
            display: 'flex',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          <span>Free</span>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span>No Registration</span>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span>100% in Browser</span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '22px',
            color: '#6b7280',
            fontWeight: 500,
          }}
        >
          signmypdf.io
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
