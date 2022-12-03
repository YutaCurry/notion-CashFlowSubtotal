import { assetsSubTotal } from './funcs';

async function main() {
  console.log('assetsSubTotal ======');
  await assetsSubTotal();

  console.log('end ======');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
