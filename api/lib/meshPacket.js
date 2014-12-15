// meshPacket.js
// Represents a LWM packet
var Packet = function(lqi, rssi, srcAddr, dstAddr, srcEndpoint, dstEndpoint, size, data)
{
  this.lqi = lqi;
  this.rssi = rssi;
  this.srcAddr = srcAddr;
  this.dstAddr = dstAddr;
  this.srcEndpoint = srcEndpoint;
  this.dstEndpoint = dstEndpoint;
  this.size = size;
  this.data = data;
};

module.exports = Packet;
