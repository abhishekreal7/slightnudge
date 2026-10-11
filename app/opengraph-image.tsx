import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', background: '#f7f8f6', color: '#17211f', padding: 64, fontFamily: 'Arial', position: 'relative' }}>
    <div style={{ width: 510, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 25, fontWeight: 600 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: '#176b55', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</div>SlightNudge</div>
      <div style={{ display: 'flex', fontSize: 66, lineHeight: 1, letterSpacing: -4, fontWeight: 500, marginTop: 42 }}>Make the small changes feel small.</div>
      <div style={{ display: 'flex', fontSize: 21, lineHeight: 1.5, color: '#697571', marginTop: 22 }}>Refine your product visually, right where it lives.</div>
    </div>
    <div style={{ position: 'absolute', right: 50, top: 57, width: 540, height: 516, border: '1px solid #dce2de', borderRadius: 16, background: '#fff', padding: 20, display: 'flex', flexDirection: 'column', boxShadow: '0 20px 70px #173a3015' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38, borderBottom: '1px solid #e2e7e4', paddingBottom: 12, fontSize: 13, color: '#78847c' }}><span>slightnudge / playground</span><span>Save</span></div>
      <div style={{ display: 'flex', flex: 1, marginTop: 14 }}>
        <div style={{ width: 345, border: '1px solid #e2e7e4', borderRadius: 9, padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, color: '#697571' }}>northstar.app / product</div>
          <div style={{ fontSize: 37, lineHeight: 1.06, letterSpacing: -1.8, fontWeight: 600, marginTop: 53 }}>Make room for your best work.</div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: '#697571', marginTop: 14 }}>A thoughtful workspace for your team.</div>
          <div style={{ marginTop: 'auto', height: 95, borderRadius: 7, background: '#eff3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#728078', fontSize: 14 }}>Live page preview</div>
        </div>
        <div style={{ width: 154, marginLeft: 10, padding: 14, border: '1px solid #e2e7e4', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Typography</div><div style={{ fontSize: 12, color: '#78847c' }}>Selected heading</div><div style={{ fontSize: 12, color: '#78847c' }}>Text size</div><div style={{ height: 31, border: '1px solid #e2e7e4', borderRadius: 5, padding: 8, fontSize: 13 }}>36 px</div><div style={{ fontSize: 12, color: '#78847c' }}>Weight</div><div style={{ height: 31, border: '1px solid #e2e7e4', borderRadius: 5, padding: 8, fontSize: 13 }}>Medium</div><div style={{ height: 34, borderRadius: 6, background: '#176b55', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginTop: 'auto' }}>Apply change</div>
        </div>
      </div>
    </div>
  </div>, size);
}
