export const searchKey = (text: string): string =>
  text.replaceAll("œ", "oe").replaceAll("æ", "ae").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
