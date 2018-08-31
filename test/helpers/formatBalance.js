export default function formatBalance (balance, decimals) {
  balance = balance.toString();
  balance = balance / (10 ** decimals);
  return balance.toString();
}
