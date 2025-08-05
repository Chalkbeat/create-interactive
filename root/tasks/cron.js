/*

Runs tasks on an automated basis

*/

/** config variables **/
var tasks = {
  local: ["sheets", "static"],
  stage: ["sheets", "clean", "static", "publish"],
  live: ["sheets", "clean", "static", "publish:live"]
};

var interval = 15;

/** end config **/

export default function(heist) {

  heist.defineTask("cron", "Run the build on a timer", function(target = "local") {

    console.log(`Setting ${interval} second timer for a ${target} target...`);

    setTimeout(async function() {
      var run = tasks[target] || tasks.local;
      await heist.run(run);
      heist.run([`cron:${interval}:${target}`]);
    }, interval * 1000);

  });

};