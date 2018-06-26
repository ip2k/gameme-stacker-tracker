//var apiBase = 'https://cors-anywhere.herokuapp.com/'
window.apiBase = 'http://127.0.0.1:8080/'

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

async function getServerAddress() {
    if (window.location.hash) {
      return window.location.hash.replace('#', '')
    } else {
      return '66.151.138.182:27015' // default to Hyperion when no URL fragment specifies a server
    }
}
/*
async function addRow(playerObject) {
    if (['Red', 'Blue'].indexOf(playerObject.team) === -1) { // no team
      return true
    }
    var table = document.getElementById(playerObject.team);
    // Create an empty <tr> element and add it to the 1st position of the table:
    var row = table.insertRow();
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
    return true
}
*/

async function _parsePlayer(playerDoc) {
      if (!playerDoc) { 
        return {
          historickd: 0,
          historickills: 0,
          historicdeaths: 0,
          wl: 0,
          wins: 0,
          losses: 0
        }
      }
      var linkid = playerDoc.getElementsByTagName('id')[0].firstChild.data
      var name = playerDoc.getElementsByTagName('name')[0].firstChild.data
      var link = `<a href='${clientAPIBaseURL}/playerinfo/${linkid}'>${name}</a>`
      var wins = playerDoc.getElementsByTagName('wins')[0].firstChild.data
      var losses = playerDoc.getElementsByTagName('losses')[0].firstChild.data
      var historicKills = playerDoc.getElementsByTagName('kills')[0].firstChild.data
      var historicDeaths = playerDoc.getElementsByTagName('deaths')[0].firstChild.data
      var historicKDRaw = (historicKills / historicDeaths).toFixed(3)
      if (isFinite(historicKDRaw)) {
        var historickd = Number(historicKDRaw)
      } else {
        var historickd = Number(0)
      }
      var wlRaw = (wins / losses).toFixed(3)
      if (isFinite(wlRaw)) {
        var wl = Number(wlRaw)
      } else {
        var wl = Number(0)
      }
      return {
        historickd: historickd,
        historickills: historicKills,
        historicdeaths: historicDeaths,
        wl: wl,
        wins: wins,
        losses: losses,
        link: link
      }
  }

  async function _getPlayerFromAPI(clientAPIBaseURL, player) {
        try {
          var playerDoc = await getXML(`${apiBase}${clientAPIBaseURL}/api/playerinfo/tf/${player.id}`) // encodeURIComponent ?
          if (playerDoc.getElementsByTagName('error').length > 0) { return false }  // API errors with HTTP 200 :\
          return playerDoc
        } catch (exception) {
          console.error(`Failed to retrieve player info for ${id} (${name}): (${exception})`)
          return false
        }
    }

    async function getPlayer(clientAPIBaseURL, inputPlayer) {
      console.log("Player: ", inputPlayer)
        var cacheKey = `${clientAPIBaseURL}::${inputPlayer.id}`
        var cached = await store.get(cacheKey)
        if (cached === undefined) {
          console.log(`Cache miss on ${cacheKey}`)
          var playerDoc = await _getPlayerFromAPI(clientAPIBaseURL, inputPlayer)
          //if (!playerDoc) { return {wins: 0,losses: 0,wl: 0,historickills: 0,historicdeaths: 0,historickd: 0} } // no need to store. We're done here.
          var player = await _parsePlayer(playerDoc)
          await store.set(cacheKey, player, Date.now() + 259200000)
          return Object.assign(player, inputPlayer)
          // get player, parse, timestamp, store, return
        } else {
          console.log(`Cache hit on ${cacheKey}`)
          return Object.assign(cached, inputPlayer)
          // check timestamp, if bad timestamp, do same as above
         // if (cached.time < (Date.now() - 259200000)) { // 3 days in ms }
        }
    }


    /* MAIN */
    var main = async function () {
      const done = await contentLoaded
      console.log('loaded')
      const server = await getServerAddress()

      const serverDoc = await getXML(`${apiBase}http://api.gameme.net/serverinfo/${server}/players`)
      window.clientAPIBaseURL = serverDoc.getElementsByTagName("url")[0].firstChild.data
      //playersDoc = serverDoc.documentElement.childNodes[1].childNodes["0"].childNodes[15]
      const playersRaw = serverDoc.getElementsByTagName("player")
      window.players = []

      for (var i = 0; i < playersRaw.length; i++) {
        $('#status').text(`Loading ${i+1} of ${playersRaw.length} players, please wait...`)
        var playerRaw = playersRaw[i]
        var name = playerRaw.getElementsByTagName('name')[0].firstChild.data
        var team = playerRaw.getElementsByTagName('team')[0].firstChild.data
        var id = playerRaw.getElementsByTagName('uniqueid')[0].firstChild.data
        var kills = Number(playerRaw.getElementsByTagName('kills')[0].firstChild.data)
        var deaths = Number(playerRaw.getElementsByTagName('deaths')[0].firstChild.data)
        var kdRaw = (kills / deaths).toFixed(3)
        if (isFinite(kdRaw)) {
          var kd = Number(kdRaw)
        } else {
          var kd = Number(0)
        }

        var player = await getPlayer(clientAPIBaseURL, {name: name, team: team, id: id, kills: kills, deaths: deaths, kd: kd})
        console.log(player)
        window.players.push(player)
        //await addRow(player)
      }
/*
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
        } catch (exception) {
          var wins, losses, wl, historicKills, historicDeaths, historicKDRaw = 0
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
*/
      console.log(players)

      $.dynatableSetup({
        features: {
          paginate: false,
          sort: true,
          pushState: true,
          search: false,
          recordCount: false,
          perPageSelect: false
        },
        dataset: {
          perPageDefault: 20,
          sorts: {kills: -1}
        }
      });

      $('#Red').dynatable({
        dataset: {
          records: window.players.filter(p => { return p.team === 'Red'})
        }
      })
      $('#Blue').dynatable({
        dataset: {
          records: window.players.filter(p => { return p.team === 'Blue'})
        }
      })
      $('#stats').show()
      $('#Red').show()
      $('#Blue').show()
      $('#status').hide()
    }()


    /* NOTES */
    