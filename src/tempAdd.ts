import { templateAdd } from './funcs';

async function main() {
  console.log('templateAdd ======');
  await templateAdd();

  console.log('end ======');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
