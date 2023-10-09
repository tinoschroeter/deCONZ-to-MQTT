const config = {
  deconz: {
    host: "",
    api: "",
    port: 443,
  },
  mqtt: {
    host: "",
    port: 1883,
  },
  sensors: null,
  lights: null,
};

// don't edit!!
const init = (async () => {
  return new Promise((resolve, reject) => {
    fetch(`http://${config.deconz.host}/api/${config.deconz.api}`)
      .then((request) => request.json())
      .then((data) => {
        const getItems = (keys, type) => {
          const result = {};

          keys.forEach((id) => {
            let item = data[type][id];

            const obj = {};

            if (item) {
              obj.topic = `deconz/${item.type
                .toLowerCase()
                .replace("zha", "")
                .replaceAll("-", "_")
                .replaceAll("/", "_")
                .replaceAll(" ", "_")}/${item.name
                .toLowerCase()
                .replaceAll("-", "_")
                .replaceAll("/", "_")
                .replaceAll(" ", "_")}`;
              obj.manufacturename = item.manufacturername;
            }

            result[id] = obj;
          });

          return result;
        };

        config.sensors = getItems(Object.keys(data.sensors), "sensors");
        config.lights = getItems(Object.keys(data.lights), "lights");

        console.log(config);
        resolve(config);
      })
      .catch((err) => reject(err));
  });
})();

module.exports = init;
