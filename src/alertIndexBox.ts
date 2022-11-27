import { alertIndexBox } from './funcs';

async function main() {

    console.log('alertIndexBox ======')
    await alertIndexBox()
  
    console.log('end ======')
}

main()
.then(() => process.exit(0))
.catch((err) => {
    console.error(err);
    process.exit(1);
});