const photoCredits = import.meta.glob<Record<string, string>>(
  '../assets/hero/credits.json',
  { eager: true, import: 'default' },
)

export function getHeroPhotoCredits() {
  return Object.values(photoCredits).flatMap((credits) =>
    Object.values(credits).filter((credit) => typeof credit === 'string' && credit.trim()),
  )
}
