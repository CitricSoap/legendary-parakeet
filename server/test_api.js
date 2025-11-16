const base = 'http://127.0.0.1:3000';

async function run(){
  try{
    console.log('\n== register alice ==');
    let r = await fetch(base + '/api/register', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'alice', password:'secret'})});
    console.log('status', r.status, await r.text());

    console.log('\n== login alice ==');
    r = await fetch(base + '/api/login', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'alice', password:'secret'})});
    const alice = await r.json();
    console.log('status', r.status, alice);
    const tokenA = alice.token;

    console.log('\n== alice creates post ==');
    r = await fetch(base + '/api/posts', {method:'POST', headers:{'content-type':'application/json','authorization':'Bearer ' + tokenA}, body: JSON.stringify({text:'Hello from alice'})});
    const post = await r.json();
    console.log('status', r.status, post);

    console.log('\n== register bob ==');
    r = await fetch(base + '/api/register', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'bob', password:'pw'})});
    console.log('status', r.status, await r.text());

    console.log('\n== login bob ==');
    r = await fetch(base + '/api/login', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'bob', password:'pw'})});
    const bob = await r.json();
    console.log('status', r.status, bob);
    const tokenB = bob.token;

    console.log('\n== bob tries to delete alice post ==');
    r = await fetch(base + '/api/posts/' + post.id, {method:'DELETE', headers:{'authorization':'Bearer ' + tokenB}});
    console.log('status', r.status, await r.text());

    console.log('\n== bob likes alice post ==');
    r = await fetch(base + '/api/posts/' + post.id + '/like', {method:'POST', headers:{'authorization':'Bearer ' + tokenB}});
    console.log('status', r.status, await r.text());

    console.log('\n== alice deletes post ==');
    r = await fetch(base + '/api/posts/' + post.id, {method:'DELETE', headers:{'authorization':'Bearer ' + tokenA}});
    console.log('status', r.status, await r.text());

    console.log('\n== posts after deletion ==');
    r = await fetch(base + '/api/posts');
    console.log('status', r.status, await r.text());

    console.log('\n== alice posts highscore ==');
    r = await fetch(base + '/api/highscore', {method:'POST', headers:{'content-type':'application/json','authorization':'Bearer ' + tokenA}, body: JSON.stringify({score: 555})});
    console.log('status', r.status, await r.text());

    console.log('\n== current highscore ==');
    r = await fetch(base + '/api/highscore');
    console.log('status', r.status, await r.text());

    console.log('\n== /api/me with alice token ==');
    r = await fetch(base + '/api/me', {headers:{'authorization':'Bearer ' + tokenA}});
    console.log('status', r.status, await r.text());

  }catch(err){
    console.error('ERROR', err);
  }
}

run();
