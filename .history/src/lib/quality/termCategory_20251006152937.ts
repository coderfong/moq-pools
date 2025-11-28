// Derive a normalized category slug from a search term.
// Keeps alphanumerics, collapses whitespace, joins with dashes.
// Examples: "x ray machine" -> x-ray-machine, "C Arm X Ray" -> c-arm-x-ray

export function termToCategorySlug(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ' ') // remove punctuation except hyphen
    .replace(/\s+/g, ' ')
    .replace(/ /g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
