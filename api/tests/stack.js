var mesh = require("./../lib/mesh");
var Protocol = require("./../lib/protocol");

mesh.on("gotAnnounce", function(srcAddr, euiAddr)
{
  console.log("got Announce:", srcAddr, euiAddr);
});
