// Opt in only on Windows; other platforms retain their existing font stacks.
const platform = navigator.userAgentData?.platform || navigator.platform || '';
if (/^Win/i.test(platform)) document.documentElement.dataset.platform = 'windows';
