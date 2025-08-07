export const deploySteps = [
  { id: 'wallet', title: 'Select wallet with node licenses', description: 'Before you can deploy nodes, you need to get licenses' },
  { id: 'licenses', title: 'Select Licenses', description: 'Select the licenses you want to deploy nodes with' },
  { id: 'delegate', title: 'Delegate Licenses', description: 'Delegate your licenses to activate the nodes' },
  { id: 'deploy', title: 'Deploy Nodes', description: 'Spin up infrastructure for your nodes' },
] as const;