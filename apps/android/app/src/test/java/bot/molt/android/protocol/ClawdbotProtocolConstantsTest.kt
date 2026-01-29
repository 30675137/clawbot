package bot.molt.android.protocol

import org.junit.Assert.assertEquals
import org.junit.Test

class clawbotProtocolConstantsTest {
  @Test
  fun canvasCommandsUseStableStrings() {
    assertEquals("canvas.present", clawbotCanvasCommand.Present.rawValue)
    assertEquals("canvas.hide", clawbotCanvasCommand.Hide.rawValue)
    assertEquals("canvas.navigate", clawbotCanvasCommand.Navigate.rawValue)
    assertEquals("canvas.eval", clawbotCanvasCommand.Eval.rawValue)
    assertEquals("canvas.snapshot", clawbotCanvasCommand.Snapshot.rawValue)
  }

  @Test
  fun a2uiCommandsUseStableStrings() {
    assertEquals("canvas.a2ui.push", clawbotCanvasA2UICommand.Push.rawValue)
    assertEquals("canvas.a2ui.pushJSONL", clawbotCanvasA2UICommand.PushJSONL.rawValue)
    assertEquals("canvas.a2ui.reset", clawbotCanvasA2UICommand.Reset.rawValue)
  }

  @Test
  fun capabilitiesUseStableStrings() {
    assertEquals("canvas", clawbotCapability.Canvas.rawValue)
    assertEquals("camera", clawbotCapability.Camera.rawValue)
    assertEquals("screen", clawbotCapability.Screen.rawValue)
    assertEquals("voiceWake", clawbotCapability.VoiceWake.rawValue)
  }

  @Test
  fun screenCommandsUseStableStrings() {
    assertEquals("screen.record", clawbotScreenCommand.Record.rawValue)
  }
}
