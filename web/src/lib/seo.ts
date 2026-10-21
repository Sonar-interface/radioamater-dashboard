export const seo = (title: string, description: string) => ({
  meta: [
    { title: `${title} | HAM Hrvatska` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | HAM Hrvatska` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
