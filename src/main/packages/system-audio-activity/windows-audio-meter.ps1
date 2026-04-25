param(
    [int]$IntervalMs = 100,
    [int]$Samples = 0
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

public static class PetmateWindowsAudioMeter
{
    private const int CLSCTX_ALL = 23;

    public static void Run(int intervalMs, int samples)
    {
        IMMDeviceEnumerator enumerator = null;
        IMMDevice device = null;
        IAudioMeterInformation meter = null;
        IAudioEndpointVolume endpointVolume = null;

        try
        {
            enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
            Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device));

            Guid meterGuid = typeof(IAudioMeterInformation).GUID;
            object meterObject;
            Marshal.ThrowExceptionForHR(device.Activate(ref meterGuid, CLSCTX_ALL, IntPtr.Zero, out meterObject));
            meter = (IAudioMeterInformation)meterObject;

            Guid endpointVolumeGuid = typeof(IAudioEndpointVolume).GUID;
            object endpointVolumeObject;
            Marshal.ThrowExceptionForHR(device.Activate(ref endpointVolumeGuid, CLSCTX_ALL, IntPtr.Zero, out endpointVolumeObject));
            endpointVolume = (IAudioEndpointVolume)endpointVolumeObject;

            int emittedSamples = 0;
            while (samples <= 0 || emittedSamples < samples)
            {
                float peak;
                float volume;
                bool muted;
                Marshal.ThrowExceptionForHR(meter.GetPeakValue(out peak));
                Marshal.ThrowExceptionForHR(endpointVolume.GetMasterVolumeLevelScalar(out volume));
                Marshal.ThrowExceptionForHR(endpointVolume.GetMute(out muted));
                Console.WriteLine(
                    peak.ToString("0.000000", CultureInfo.InvariantCulture) + "," +
                    volume.ToString("0.000000", CultureInfo.InvariantCulture) + "," +
                    (muted ? "1" : "0")
                );
                Console.Out.Flush();
                emittedSamples++;
                Thread.Sleep(intervalMs);
            }
        }
        finally
        {
            if (endpointVolume != null) Marshal.ReleaseComObject(endpointVolume);
            if (meter != null) Marshal.ReleaseComObject(meter);
            if (device != null) Marshal.ReleaseComObject(device);
            if (enumerator != null) Marshal.ReleaseComObject(enumerator);
        }
    }
}

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator
{
}

enum EDataFlow
{
    eRender,
    eCapture,
    eAll
}

enum ERole
{
    eConsole,
    eMultimedia,
    eCommunications
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator
{
    [PreserveSig]
    int EnumAudioEndpoints(EDataFlow dataFlow, int dwStateMask, IntPtr ppDevices);

    [PreserveSig]
    int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppEndpoint);

    [PreserveSig]
    int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);

    [PreserveSig]
    int RegisterEndpointNotificationCallback(IntPtr pClient);

    [PreserveSig]
    int UnregisterEndpointNotificationCallback(IntPtr pClient);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice
{
    [PreserveSig]
    int Activate(
        ref Guid iid,
        int dwClsCtx,
        IntPtr pActivationParams,
        [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface
    );

    [PreserveSig]
    int OpenPropertyStore(int stgmAccess, IntPtr ppProperties);

    [PreserveSig]
    int GetId(out IntPtr ppstrId);

    [PreserveSig]
    int GetState(out int pdwState);
}

[Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioMeterInformation
{
    [PreserveSig]
    int GetPeakValue(out float pfPeak);

    [PreserveSig]
    int GetMeteringChannelCount(out int pnChannelCount);

    [PreserveSig]
    int GetChannelsPeakValues(int u32ChannelCount, [Out] float[] afPeakValues);

    [PreserveSig]
    int QueryHardwareSupport(out int pdwHardwareSupportMask);
}

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume
{
    [PreserveSig]
    int RegisterControlChangeNotify(IntPtr pNotify);

    [PreserveSig]
    int UnregisterControlChangeNotify(IntPtr pNotify);

    [PreserveSig]
    int GetChannelCount(out uint pnChannelCount);

    [PreserveSig]
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);

    [PreserveSig]
    int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);

    [PreserveSig]
    int GetMasterVolumeLevel(out float pfLevelDB);

    [PreserveSig]
    int GetMasterVolumeLevelScalar(out float pfLevel);

    [PreserveSig]
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);

    [PreserveSig]
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);

    [PreserveSig]
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);

    [PreserveSig]
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);

    [PreserveSig]
    int SetMute(bool bMute, Guid pguidEventContext);

    [PreserveSig]
    int GetMute(out bool pbMute);

    [PreserveSig]
    int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);

    [PreserveSig]
    int VolumeStepUp(Guid pguidEventContext);

    [PreserveSig]
    int VolumeStepDown(Guid pguidEventContext);

    [PreserveSig]
    int QueryHardwareSupport(out uint pdwHardwareSupportMask);

    [PreserveSig]
    int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}
'@

[PetmateWindowsAudioMeter]::Run($IntervalMs, $Samples)
