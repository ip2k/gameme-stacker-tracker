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
  return new Promise(function (resolve) {
    if (window.location.hash) {
      resolve(window.location.hash.replace('#', ''))
    } else {
      resolve('66.151.138.182:27015') // default to Hyperion when no URL fragment specifies a server
    }
  })
}

function addRow(playerObject) {
  return new Promise(function (resolve) {
    if (['Red', 'Blue'].indexOf(playerObject.team) === -1) {  // no team
      resolve(true)
    }
    var table = document.getElementById(playerObject.team);
    // Create an empty <tr> element and add it to the 1st position of the table:
    var row = table.insertRow(0);
    // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
    var name = row.insertCell(0);
    var id = row.insertCell(1);
    var kills = row.insertCell(2);
    var deaths = row.insertCell(3);
    var kd = row.insertCell(4);
    var historickd = row.insertCell(5);
    var wins = row.insertCell(6);
    var losses = row.insertCell(7);
    // Add some text to the new cells:
    name.innerHTML = playerObject.name;
    id.innerHTML = playerObject.id;
    kills.innerHTML = playerObject.kills;
    deaths.innerHTML = playerObject.deaths;
    kd.innerHTML = playerObject.kd;
    historickd.innerHTML = playerObject.historickd;
    wins.innerHTML = playerObject.wins;
    losses.innerHTML = playerObject.losses;
    resolve(true)
  })
}

/* MAIN */
var main = async function () {
  const done = await contentLoaded
  console.log('loaded')
  const server = await getServerAddress()

  const serverDoc = await getXML(`https://cors-anywhere.herokuapp.com/http://api.gameme.net/serverinfo/${server}/players`)
  const clientAPIBaseURL = serverDoc.getElementsByTagName("url")[0].firstChild.data
  //playersDoc = serverDoc.documentElement.childNodes[1].childNodes["0"].childNodes[15]
  const playersRaw = serverDoc.getElementsByTagName("player")
  var players = []

  for (var i = 0; i < playersRaw.length; i++) {
    var player = playersRaw[i]
    var name = player.getElementsByTagName('name')[0].firstChild.data
    var team = player.getElementsByTagName('team')[0].firstChild.data
    var id = player.getElementsByTagName('uniqueid')[0].firstChild.data
    var kills = Number(player.getElementsByTagName('kills')[0].firstChild.data)
    var deaths = Number(player.getElementsByTagName('deaths')[0].firstChild.data)
    var kdRaw = Math.round(((kills / deaths) * 100 / 100))
    if (isFinite(kdRaw)) {
      var kd = Number(kdRaw)
    } else {
      var kd = Number(0)
    }
    // process client API response (detailed player history)
    // TODO: localstorage for this
    try {
      var playerDoc = await getXML(`https://cors-anywhere.herokuapp.com/${clientAPIBaseURL}/api/playerinfo/tf/${id}`) // encodeURIComponent ?
      var wins = playerDoc.getElementsByTagName('wins')[0].firstChild.data
      var losses = playerDoc.getElementsByTagName('losses')[0].firstChild.data
      var historicKills = playerDoc.getElementsByTagName('kills')[0].firstChild.data
      var historicDeaths = playerDoc.getElementsByTagName('deaths')[0].firstChild.data
      var historicKDRaw = Math.round(((historicKills / historicDeaths) * 100 / 100))
      if (isFinite(historicKDRaw)) {
        var historickd = Number(historicKDRaw)
      } else {
        var historickd = Number(0)
      }
    } catch (exception) {
      var wins, losses, historicKills, historicDeaths, historicKDRaw = 0
      console.error(`Failed to retrieve player info for ${id} (${name}): (${exception})`)
    }

    playerObj = {
      name: name,
      kills: kills,
      deaths: deaths,
      kd: kd,
      historickd: historickd,
      historickills: historicKills,
      historicdeaths: historicDeaths,
      wins: wins,
      losses: losses,
      team: team,
      id: id
    }
    console.log(playerObj)
    players.push(playerObj)
    await addRow(playerObj)
  } // end playersRaw processing

  console.log(players)
}()


/* NOTES */
//  http://api.gameme.net/serverinfo/66.151.138.182:27015/players
// http://fragmasters.gameme.com/api/playerinfo/tf/STEAM_0:0:38105299
// https://cors-anywhere.herokuapp.com/
// example: http://api.gameme.net/serverinfo/87.117.217.32:27017/players


/* TODO
- Map red vs blu win ratio 
- team K/Ds + scores
- table layout
- append HTML: parent.appendChild(el);
*/