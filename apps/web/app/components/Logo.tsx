import Image from 'next/image';
import logoSrc from '../../public/logo.png';

/**
 * SignMyPDF brand mark — renders the bundled /public/logo.png. The
 * source asset is 1465 × 1441 (≈1.017 aspect ratio); this component
 * scales it down to a header / footer-friendly height by default.
 *
 * Pass `height` to override (e.g. larger in a hero block, smaller in
 * dense navs). Width is computed from the source aspect ratio so the
 * rendered box is always proportional.
 */
const ASPECT_RATIO = 1465 / 1441;

interface Props {
  /** Rendered height in CSS px. Default 40 — comfortable header size. */
  height?: number;
}

export default function Logo({ height = 40 }: Props) {
  const width = Math.round(height * ASPECT_RATIO);
  return (
    <Image
      src={logoSrc}
      alt="SignMyPDF"
      width={width}
      height={height}
      priority
      style={{ display: 'block' }}
    />
  );
}
