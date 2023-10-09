"use strict";

const fs = require("fs");
const filePath = "config.txt";

const WebSocket = require("ws");
const mqtt = require("mqtt");
const init = require("./init");

const topicMap = new Map();

init.then((config) => {
  let mqttConnected = false;
  const socket = new WebSocket(
    `ws://${config.deconz.host}:${config.deconz.port}`
  );

  const client = mqtt.connect(
    `mqtt://${config.mqtt.host}:${config.mqtt.port}`,
    {
      keepalive: 10000,
      clientId: "deconz-to-mqtt",
      username: config.mqtt.username,
      password: config.mqtt.password,
    }
  );

  client.on("error", () => {
    console.log("MQTT connection failure or parsing error");
    mqttConnected = false;
  });

  client.on("offline", () => {
    console.log("MQTT going offline");
    mqttConnected = false;
  });

  client.on("connect", () => {
    console.log("MQTT Server connected");
    mqttConnected = true;

    const subs = Object.keys(config.lights).map(
      (item) => config.lights[item].topic
    );

    const sensor_config_list = Object.keys(config.sensors).map(
      (item) => config.sensors[item].config
    );

    Object.keys(config.lights).forEach((key) =>
      topicMap.set(config.lights[key].topic, key)
    );

    client.subscribe(subs);

    console.log("Actuators: ", subs.sort());
    console.log("Sensors: ", sensor_list.sort());

    const content = `Actuators: ${JSON.stringify(
      subs.sort(),
      null,
      1
    )}\n Sensors: ${JSON.stringify(
      sensor_list.sort(),
      null,
      2
    )}\n${JSON.stringify(config, null, 2)}`;
    fs.writeFile(filePath, content, (err) => {
      if (err) return console.error(err);
      console.log("file was written...");
    });
  });

  client.on("end", () => {
    console.log("MQTT shutdown");
    mqttConnected = false;
  });

  client.on("message", (topic, message) => {
    const id = topicMap.get(topic);
    const data = message.toString();

    fetch(
      `http://${config.deconz.host}/api/${config.deconz.api}/lights/${id}/state`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: data,
      }
    )
      .then((resolve) => resolve.json())
      .then((data) => {
        const { success, error } = data[0];

        if (error) {
          console.log(`error: topic: ${topic} ${JSON.stringify(error)}`);
        } else {
          console.log(`success: topic: ${topic} ${JSON.stringify(success)}`);
        }
      });
  });

  socket.on("open", () => {
    socket.on("message", (data) => {
      const sensorData = JSON.parse(data);
      const id = sensorData.id;
      const sensor = config.sensors[id];
      const ligthts = config.lights[id];
      const resource = sensorData.r;

      const topic = sensor?.topic ? sensor.topic : ligthts?.topic;

      if (topic === undefined) {
        return;
      }

      const deconzConfig = JSON.stringify(sensorData.config);
      const deconzAtt = JSON.stringify(sensorData.attr);

      const deconzConfigTopic = topic.replace("deconz/", "deconz/config/");
      const deconzAttrTopic = topic.replace("deconz/", "deconz/attr/");

      if (deconzConfig) {
        client.publish(deconzConfigTopic, `${deconzConfig}`);
        console.log(`topic: ${deconzConfigTopic} data: ${deconzConfig}`);
      }

      if (deconzAtt) {
        client.publish(deconzAttrTopic, `${deconzAtt}`);
        console.log(`topic: ${deconzAttrTopic} data: ${deconzAtt}`);
      }

      if (sensor === undefined) {
        return;
      }

      if (resource !== "sensors") {
        return;
      }

      const value = JSON.stringify(sensorData.state);

      if (!value) return;

      if (mqttConnected) {
        client.publish(topic, `${value}`, { qos: 1 });
        console.log(`topic: ${topic} data: ${value}`);
      } else {
        console.log("mqtt not connected.");
      }
    });
  });

  socket.on("error", () => {
    console.log("something has gone wrong");
  });

  console.log("server is running");
});
