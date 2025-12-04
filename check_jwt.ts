
async function checkJwtImport() {
    const jwt = await import('jsonwebtoken');
    console.log('jwt object keys:', Object.keys(jwt));
    console.log('jwt.default:', jwt.default);
    console.log('jwt.verify:', jwt.verify);
    console.log('jwt.default.verify:', jwt.default?.verify);
}

checkJwtImport();
