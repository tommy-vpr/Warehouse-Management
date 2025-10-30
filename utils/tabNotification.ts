export const updateTabIndicator = (hasNotification: boolean) => {
  const baseTitle = document.title.replace(/^\(\d+\) /, "");

  if (hasNotification) {
    document.title = `(1) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
};
