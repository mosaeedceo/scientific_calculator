const { withGradleProperties } = require("expo/config-plugins");

module.exports = function withArm64Only(config) {
  return withGradleProperties(config, (config) => {
    const property = {
      type: "property",
      key: "reactNativeArchitectures",
      value: "arm64-v8a",
    };
    const index = config.modResults.findIndex(
      (item) => item.type === "property" && item.key === property.key,
    );

    if (index >= 0) {
      config.modResults[index] = property;
    } else {
      config.modResults.push(property);
    }

    return config;
  });
};
