import ora from 'ora';
import chalk from 'chalk';
import { ServerRegistry } from '../core/server-registry.js';

export interface UpdateOptions {
  clearCache?: boolean;
  showCache?: boolean;
}

export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  const spinner = ora('Updating server registry...').start();

  try {
    const serverRegistry = new ServerRegistry();

    if (options.showCache) {
      spinner.stop();
      const cacheInfo = serverRegistry.getCacheInfo();

      console.log(chalk.cyan('📦 Registry Cache Information:'));
      console.log(
        `  Status: ${cacheInfo.exists ? chalk.green('exists') : chalk.yellow('not found')}`
      );
      console.log(`  Location: ${cacheInfo.path}`);

      if (cacheInfo.exists) {
        console.log(
          `  Age: ${cacheInfo.age ? chalk.blue(`${Math.round(cacheInfo.age * 10) / 10}h`) : 'unknown'}`
        );
        console.log(
          `  Size: ${cacheInfo.size ? chalk.blue(`${Math.round(cacheInfo.size / 1024)}KB`) : 'unknown'}`
        );
      }

      return;
    }

    if (options.clearCache) {
      spinner.text = 'Clearing cache...';
      await serverRegistry.clearCache();
    }

    spinner.text = 'Refreshing registry from remote...';
    await serverRegistry.refreshRegistry();

    const stats = await serverRegistry.getServerStats();

    spinner.succeed(chalk.green(`✅ Registry updated successfully!`));
    console.log(chalk.cyan(`📊 Registry Stats:`));
    console.log(`  Total servers: ${chalk.bold(stats.total)}`);
    console.log(`  Categories: ${Object.keys(stats.byCategory).join(', ')}`);
    console.log(`  Requires auth: ${stats.requiresAuth}`);
  } catch (error) {
    spinner.fail(chalk.red(`❌ Failed to update registry`));

    if (error instanceof Error) {
      console.error(chalk.red(error.message));

      if (error.message.includes('fetch')) {
        console.log(chalk.yellow('\n💡 Tip: Check your internet connection and try again'));
        console.log(chalk.yellow('   You can also use --clear-cache to remove corrupted cache'));
      }
    }

    process.exit(1);
  }
}
