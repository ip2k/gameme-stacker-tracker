var apiBase = 'https://cors-anywhere.herokuapp.com/'


// REF: https://github.com/jonathantneal/document-promises
// thenfied document ready states
const thenify = (type, readyState) => new Promise((resolve) => {
  const listener = () => {
    if (readyState.test(document.readyState)) {
      document.removeEventListener(type, listener);

      resolve();
    }
  };

  document.addEventListener(type, listener);

  listener();
});

// export thenfied parsed, contentLoaded, and loaded
const parsed = thenify('readystatechange', /^(?:interactive|complete)$/);
const contentLoaded = thenify('DOMContentLoaded', /^(?:interactive|complete)$/);
const loaded = thenify('readystatechange', /^complete$/);


function getXML(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.responseXML);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

function getServerAddress() {
  return new Promise(function(resolve) {
    if (window.location.hash) {
      resolve(window.location.hash.replace('#', ''))
    } else {
      resolve('87.117.217.32:27017')  // default when no URL fragment specifies a server
    }
  })
}

/* MAIN */
var main = async function () {
  const done = await contentLoaded
  console.log('loaded')
  const server = await getServerAddress()
  
  const serverDoc = await getXML(`https://cors-anywhere.herokuapp.com/http://api.gameme.net/serverinfo/${server}/players`)
  //playersDoc = serverDoc.documentElement.childNodes[1].childNodes["0"].childNodes[15]
  const playersRaw = serverDoc.getElementsByTagName("player")
  var players = []
  
  for (var i=0; i < playersRaw.length; i++) {
    var player = playersRaw[i]
    var id = player.getElementsByTagName('uniqueid')[0].firstChild.data
    var kills = Number(player.getElementsByTagName('kills')[0].firstChild.data)
    var deaths = Number(player.getElementsByTagName('deaths')[0].firstChild.data)
    var kdRaw = Math.round(((kills / deaths) * 100 / 100))
    if (isFinite(kdRaw)) {
      var kd = Number(kdRaw)
    } else {
      var kd = Number(0)
    }
    var url = `https://cors-anywhere.herokuapp.com/http://api.gameme.net/playerinfo/tf2/${id}`
    var playerDoc = await getXML(url)
    debugger

    playerObj = {
      name: player.getElementsByTagName('name')[0].firstChild.data,
      kills: kills,
      deaths: deaths,
      kd: kd,
      team: player.getElementsByTagName('team')[0].firstChild.data,
      id: id
    }
    players.push(playerObj)
    console.log(playerObj)
  } // end playersRaw processing

  console.log(players)
  debugger
}()


/* NOTES */
//  http://api.gameme.net/serverinfo/66.151.138.182:27015/players
// http://fragmasters.gameme.com/api/playerinfo/tf/STEAM_0:0:38105299
// https://cors-anywhere.herokuapp.com/
// example: http://api.gameme.net/serverinfo/87.117.217.32:27017/players


/* TODO
- get per-player metrics
- team K/Ds + scores
- table layout
- append HTML: parent.appendChild(el);
*/