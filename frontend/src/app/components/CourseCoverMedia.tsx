import { fileUrl } from '../../api/client';

export function isCourseCoverImagePath(image: string): boolean {
  if (!image?.trim()) return false;
  const s = image.trim();
  return s.startsWith('/uploads/') || s.startsWith('http://') || s.startsWith('https://');
}

type Variant = 'gridCard' | 'detailAside';

/**
 * Курс обложкасы: жол болса <img>, әйтпесе emoji.
 */
export function CourseCoverMedia({ image, variant }: { image: string; variant: Variant }) {
  if (isCourseCoverImagePath(image)) {
    const src = fileUrl(image);
    if (variant === 'gridCard') {
      return <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />;
    }
    return (
      <img
        src={src}
        alt=""
        className="w-full rounded-xl border border-border/50 object-cover aspect-[16/10] max-h-40 shadow-sm"
        loading="lazy"
      />
    );
  }
  if (variant === 'gridCard') {
    return <span className="select-none">{image}</span>;
  }
  return <div className="text-4xl mb-4 select-none">{image}</div>;
}
